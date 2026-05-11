import { clusterApiUrl, Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { DEFAULT_SEAT_ID, ticketEvent } from '../data/ticketData';

const PROGRAM_ID = new PublicKey('35wzuQvuh6PkqoTe8sgZu8hx8cV4sG2G8h89zELaLmKD');
const INITIALIZE_EVENT_DISCRIMINATOR = Uint8Array.from([126, 249, 86, 221, 202, 171, 134, 20]);
const RESERVE_SEAT_DISCRIMINATOR = Uint8Array.from([42, 147, 222, 136, 162, 134, 183, 168]);
const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');

async function reserveStaticTicketOnChain(seatId = DEFAULT_SEAT_ID) {
  const provider = window.solana?.isPhantom ? window.solana : null;
  if (!provider) {
    throw new Error('Install Phantom wallet, switch it to Devnet, then try again.');
  }

  const connected = await provider.connect();
  const buyer = connected.publicKey;
  const [eventPda] = PublicKey.findProgramAddressSync(
    [textBytes('event'), buyer.toBuffer(), textBytes(ticketEvent.name)],
    PROGRAM_ID,
  );
  const [ticketPda] = PublicKey.findProgramAddressSync(
    [textBytes('ticket'), eventPda.toBuffer(), textBytes(seatId)],
    PROGRAM_ID,
  );

  const transaction = new Transaction();
  if (!(await connection.getAccountInfo(eventPda))) {
    transaction.add(
      new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: buyer, isSigner: true, isWritable: true },
          { pubkey: eventPda, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data: concatBytes(
          INITIALIZE_EVENT_DISCRIMINATOR,
          encodeString(ticketEvent.name),
          encodeString(ticketEvent.venue),
          encodeU64(ticketEvent.price_lamports),
          encodeU32(52),
          encodeU16(ticketEvent.per_wallet_limit),
          encodeU16(ticketEvent.resale_cap_bps),
          encodeU16(ticketEvent.royalty_bps),
        ),
      }),
    );
  }

  transaction.add(
    new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: buyer, isSigner: true, isWritable: true },
        { pubkey: buyer, isSigner: false, isWritable: true },
        { pubkey: eventPda, isSigner: false, isWritable: true },
        { pubkey: ticketPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: concatBytes(RESERVE_SEAT_DISCRIMINATOR, encodeString(seatId)),
    }),
  );

  transaction.feePayer = buyer;
  const latestBlockhash = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = latestBlockhash.blockhash;
  const result = await provider.signAndSendTransaction(transaction);
  const signature = typeof result === 'string' ? result : result.signature;
  await connection.confirmTransaction({ signature, ...latestBlockhash }, 'confirmed');
  return {
    signature,
    eventPda: eventPda.toString(),
    ticketPda: ticketPda.toString(),
    owner: buyer.toString(),
  };
}

function textBytes(value) {
  return new TextEncoder().encode(value);
}

function encodeString(value) {
  const bytes = textBytes(value);
  return concatBytes(encodeU32(bytes.length), bytes);
}

function encodeU16(value) {
  const bytes = new Uint8Array(2);
  new DataView(bytes.buffer).setUint16(0, value, true);
  return bytes;
}

function encodeU32(value) {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, true);
  return bytes;
}

function encodeU64(value) {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(value), true);
  return bytes;
}

function concatBytes(...chunks) {
  const bytes = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export { reserveStaticTicketOnChain };
